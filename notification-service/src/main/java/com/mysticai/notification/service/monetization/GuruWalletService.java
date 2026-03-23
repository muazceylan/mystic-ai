package com.mysticai.notification.service.monetization;

import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
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
        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("Duplicate reward attempt blocked: idempotencyKey={}", idempotencyKey);
            return ledgerRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(
                        GuruWallet.builder().userId(userId).build()
                ));

        int balanceBefore = wallet.getCurrentBalance();
        wallet.setCurrentBalance(balanceBefore + amount);
        wallet.setLifetimeEarned(wallet.getLifetimeEarned() + amount);
        wallet.setLastEarnedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        GuruLedger entry = GuruLedger.builder()
                .userId(userId)
                .transactionType(GuruLedger.TransactionType.REWARD_EARNED)
                .sourceType(GuruLedger.SourceType.REWARDED_AD)
                .sourceKey(sourceKey)
                .moduleKey(moduleKey)
                .actionKey(actionKey)
                .amount(amount)
                .balanceBefore(balanceBefore)
                .balanceAfter(wallet.getCurrentBalance())
                .platform(platform)
                .locale(locale)
                .idempotencyKey(idempotencyKey)
                .build();

        log.info("Guru earned: userId={}, amount={}, newBalance={}", userId, amount, wallet.getCurrentBalance());
        return ledgerRepository.save(entry);
    }

    @Transactional
    public GuruLedger spendGuru(Long userId, int cost, String moduleKey, String actionKey,
                                 String platform, String locale, String idempotencyKey) {
        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("Duplicate spend attempt blocked: idempotencyKey={}", idempotencyKey);
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
                .idempotencyKey(idempotencyKey)
                .build();

        log.info("Guru spent: userId={}, cost={}, newBalance={}", userId, cost, wallet.getCurrentBalance());
        return ledgerRepository.save(entry);
    }

    @Transactional
    public GuruLedger processPurchase(Long userId, int guruAmount, String productKey,
                                       String platform, String locale, String idempotencyKey) {
        if (idempotencyKey != null && ledgerRepository.existsByIdempotencyKey(idempotencyKey)) {
            log.warn("Duplicate purchase attempt blocked: idempotencyKey={}", idempotencyKey);
            return ledgerRepository.findByIdempotencyKey(idempotencyKey).orElse(null);
        }

        GuruWallet wallet = walletRepository.findByUserIdForUpdate(userId)
                .orElseGet(() -> walletRepository.save(
                        GuruWallet.builder().userId(userId).build()
                ));

        int balanceBefore = wallet.getCurrentBalance();
        wallet.setCurrentBalance(balanceBefore + guruAmount);
        wallet.setLifetimePurchased(wallet.getLifetimePurchased() + guruAmount);
        wallet.setLastEarnedAt(LocalDateTime.now());
        walletRepository.save(wallet);

        GuruLedger entry = GuruLedger.builder()
                .userId(userId)
                .transactionType(GuruLedger.TransactionType.PURCHASE_COMPLETED)
                .sourceType(GuruLedger.SourceType.GURU_PURCHASE)
                .sourceKey(productKey)
                .amount(guruAmount)
                .balanceBefore(balanceBefore)
                .balanceAfter(wallet.getCurrentBalance())
                .platform(platform)
                .locale(locale)
                .idempotencyKey(idempotencyKey)
                .build();

        log.info("Guru purchased: userId={}, amount={}, newBalance={}", userId, guruAmount, wallet.getCurrentBalance());
        return ledgerRepository.save(entry);
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
}
