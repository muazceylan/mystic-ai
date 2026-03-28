package com.mysticai.notification.repository;

import com.mysticai.notification.entity.NotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {

    @Query("SELECT DISTINCT p.userId FROM NotificationPreference p")
    List<Long> findDistinctUserIds();
}
