package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class GuruWalletService {

    private final GuruWalletRepository walletRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final MeterRegistry meterRegistry;

    @Transactional
    public GuruWallet getOrCreateWallet(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseGet(() -> walletRepository.save(
                        GuruWallet.builder().userId(userId).build()
                ));
    }

    @Transactional
    public GuruLedger earnReward(Long userId, int amount, String sourceKey, String moduleKey,
                                  String actionKey, String platform, String locale,
                                  String idempotencyKey) {
        return grantGuru(
                userId,
                amount,
                GuruLedger.TransactionType.REWARD_EARNED,
                GuruLedger.SourceType.REWARDED_AD,
                sourceKey,
                moduleKey,
                actionKey,
                platform,
                locale,
                idempotencyKey,
                null
        );
    }

    @Transactional
    public GuruLedger grantGuru(Long userId,
                                int amount,
                                GuruLedger.TransactionType transactionType,
                                GuruLedger.SourceType sourceType,
                                String sourceKey,
                                String moduleKey,
                                String actionKey,
                                String platform,
                                String locale,
                                String idempotencyKey,
                                String metadataJson) {
        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("Duplicate reward attempt blocked: idempotencyKey={}", idempotencyKey);
            incrementMetric("idempotency.hit", "operation", "grant", "transactionType", transactionType.name());
            return ledgerRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(
                        GuruWallet.builder().userId(userId).build()
                ));

        int balanceBefore = wallet.getCurrentBalance();
        wallet.setCurrentBalance(balanceBefore + amount);
        if (transactionType != GuruLedger.TransactionType.PURCHASE_COMPLETED) {
            wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        }
        wallet.setLastEarnedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        GuruLedger entry = GuruLedger.builder()
                .userId(userId)
                .transactionType(transactionType)
                .sourceType(sourceType)
                .sourceKey(sourceKey)
                .moduleKey(moduleKey)
                .actionKey(actionKey)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(wallet.getCurrentBalance())
                .platform(platform)
                .locale(locale)
                .metadataJson(metadataJson)
                .idempotencyKey(idempotencyKey)
                .build();

        log.info("Guru granted: userId={}, amount={}, type={}, sourceType={}, newBalance={}",
                userId, amount, transactionType, sourceType, wallet.getCurrentBalance());
        if (transactionType == GuruLedger.TransactionType.REWARD_EARNED) {
            incrementMetric("rewarded_token.granted", "sourceType", sourceType.name());
        }
        return ledgerRepository.save(entry);
    }

    @Transactional
    public GuruLedger spendGuru(Long userId, int cost, String moduleKey, String actionKey,
                                 String platform, String locale, String idempotencyKey) {
        return spendGuru(userId, cost, moduleKey, actionKey, platform, locale, idempotencyKey, null);
    }

    @Transactional
    public GuruLedger spendGuru(Long userId, int cost, String moduleKey, String actionKey,
                                String platform, String locale, String idempotencyKey,
                                String metadataJson) {
        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("Duplicate spend attempt blocked: idempotencyKey={}", idempotencyKey);
            incrementMetric("idempotency.hit", "operation", "spend", "transactionType", GuruLedger.TransactionType.GURU_SPENT.name());
            return ledgerRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("Wallet not found for userId=" + userId));

        if (wallet.getCurrentBalance() < cost) {
            throw new IllegalArgumentException("Insufficient Guru balance. Required: " + cost +
                    ", Available: " + wallet.getCurrentBalance());
        }

        int balanceBefore = wallet.getCurrentBalance();
        wallet.setCurrentBalance(balanceBefore - cost);
        wallet.setLifetimeSpent(wallet.getLifetimeSpent() + cost);
        wallet.setLastSpentAt(LocalDateTime.now());
        walletRepository.save(wallet);

        GuruLedger entry = GuruLedger.builder()
                .userId(userId)
                .transactionType(GuruLedger.TransactionType.GURU_SPENT)
                .sourceType(GuruLedger.SourceType.ACTION_UNLOCK)
                .moduleKey(moduleKey)
                .actionKey(actionKey)
                .amount(-cost)
                .balanceBefore(balanceBefore)
                .balanceAfter(wallet.getCurrentBalance())
                .platform(platform)
                .locale(locale)
                .metadataJson(metadataJson)
                .idempotencyKey(idempotencyKey)
                .build();

        log.info("Guru spent: userId={}, cost={}, newBalance={}", userId, cost, wallet.getCurrentBalance());
        return ledgerRepository.save(entry);
    }

    @Transactional
    public GuruLedger processPurchase(Long userId, int guruAmount, String productKey,
                                       String platform, String locale, String idempotencyKey) {
        boolean duplicateReplay = idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey);
        GuruLedger entry = grantGuru(
                userId,
                guruAmount,
                GuruLedger.TransactionType.PURCHASE_COMPLETED,
                GuruLedger.SourceType.GURU_PURCHASE,
                productKey,
                null,
                null,
                platform,
                locale,
                idempotencyKey,
                null
        );

        if (duplicateReplay) {
            log.info("Purchase replay returned existing ledger without reapplying lifetimePurchased: userId={}, productKey={}, idempotencyKey={}",
                    userId, productKey, idempotencyKey);
            return entry;
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseThrow(() -> new IllegalStateException("Wallet not found for userId=" + userId));
        wallet.setLifetimePurchased(wallet.getLifetimePurchased() + guruAmount);
        walletRepository.save(wallet);
        return entry;
    }

    @Transactional
    public GuruLedger adminAdjust(Long userId, int amount, GuruLedger.TransactionType type,
                                    String reason, Long adminId) {
        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(
                        GuruWallet.builder().userId(userId).build()
                ));

        int balanceBefore = wallet.getCurrentBalance();
        int newBalance = balanceBefore + amount;
        if (newBalance < 0) {
            throw new IllegalArgumentException("Adjustment would result in negative balance: " + newBalance);
        }
        wallet.setCurrentBalance(newBalance);
        walletRepository.save(wallet);

        GuruLedger entry = GuruLedger.builder()
                .userId(userId)
                .transactionType(type)
                .sourceType(GuruLedger.SourceType.ADMIN)
                .sourceKey("admin:" + adminId)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(newBalance)
                .metadataJson("{\"reason\":\"" + (reason != null ? reason.replace("\"", "'") : "") + "\",\"adminId\":" + adminId + "}")
                .idempotencyKey("admin_" + adminId + "_" + userId + "_" + System.currentTimeMillis())
                .build();

        log.info("Admin guru adjustment: userId={}, amount={}, type={}, adminId={}", userId, amount, type, adminId);
        return ledgerRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public Page<GuruLedger> getLedger(Long userId, Pageable pageable) {
        return ledgerRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    @Transactional(readOnly = true)
    public int getBalance(Long userId) {
        return walletRepository.findByUserId(userId)
                .map(GuruWallet::getCurrentBalance)
                .orElse(0);
    }

    private void incrementMetric(String name, String... tags) {
        meterRegistry.counter("notification.monetization." + name, tags).increment();
    }
}
