package com.mysticai.notification.admin.service.monetization;

import com.mysticai.notification.admin.service.AuditLogService;
import com.mysticai.notification.entity.AdminUser;
import com.mysticai.notification.entity.AuditLog;
import com.mysticai.notification.entity.monetization.GuruLedger;
import com.mysticai.notification.entity.monetization.GuruWallet;
import com.mysticai.notification.repository.GuruLedgerRepository;
import com.mysticai.notification.repository.GuruWalletRepository;
import com.mysticai.notification.service.monetization.GuruWalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminGuruWalletService {

    private final GuruWalletRepository walletRepository;
    private final GuruLedgerRepository ledgerRepository;
    private final GuruWalletService walletService;
    private final AuditLogService auditLogService;

    @Transactional(readOnly = true)
    public GuruWallet getWallet(Long userId) {
        return walletService.getOrCreateWallet(userId);
    }

    @Transactional(readOnly = true)
    public Page<GuruLedger> getLedger(Long userId, Pageable pageable) {
        return walletService.getLedger(userId, pageable);
    }

    @Transactional
    public GuruLedger grantGuru(Long userId, int amount, String reason,
                                 Long adminId, String adminEmail, AdminUser.Role role) {
        GuruLedger entry = walletService.adminAdjust(userId, amount,
                GuruLedger.TransactionType.ADMIN_GRANT, reason, adminId);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_WALLET_GRANT,
                AuditLog.EntityType.GURU_WALLET,
                userId.toString(), "grant:" + amount,
                null, entry);

        return entry;
    }

    @Transactional
    public GuruLedger revokeGuru(Long userId, int amount, String reason,
                                  Long adminId, String adminEmail, AdminUser.Role role) {
        GuruLedger entry = walletService.adminAdjust(userId, -amount,
                GuruLedger.TransactionType.ADMIN_REVOKE, reason, adminId);

        auditLogService.log(adminId, adminEmail, role,
                AuditLog.ActionType.GURU_WALLET_REVOKE,
                AuditLog.EntityType.GURU_WALLET,
                userId.toString(), "revoke:" + amount,
                null, entry);

        return entry;
    }
}
