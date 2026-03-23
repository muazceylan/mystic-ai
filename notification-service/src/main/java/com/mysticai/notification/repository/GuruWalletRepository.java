package com.mysticai.notification.repository;

import com.mysticai.notification.entity.monetization.GuruWallet;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface GuruWalletRepository extends JpaRepository<GuruWallet, Long> {

    Optional<GuruWallet> findByUserId(Long userId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM GuruWallet w WHERE w.userId = :userId")
    Optional<GuruWallet> findByUserIdForUpdate(Long userId);

    boolean existsByUserId(Long userId);
}
