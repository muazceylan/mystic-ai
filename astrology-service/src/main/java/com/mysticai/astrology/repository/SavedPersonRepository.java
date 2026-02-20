package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.SavedPerson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SavedPersonRepository extends JpaRepository<SavedPerson, Long> {

    List<SavedPerson> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    List<SavedPerson> findAllByUserIdAndRelationshipCategoryOrderByCreatedAtDesc(Long userId, String category);

    long countByUserId(Long userId);
}
