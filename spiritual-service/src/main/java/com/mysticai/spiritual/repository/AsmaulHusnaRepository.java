package com.mysticai.spiritual.repository;

import com.mysticai.spiritual.entity.AsmaulHusna;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AsmaulHusnaRepository extends JpaRepository<AsmaulHusna, Long> {
    Optional<AsmaulHusna> findByIdAndActiveTrue(Long id);
    Optional<AsmaulHusna> findFirstByActiveTrueOrderByOrderNoAsc();
    List<AsmaulHusna> findAllByActiveTrueOrderByOrderNoAsc();

    @Query("""
        select a from AsmaulHusna a
        where a.active = true
          and (:theme is null or upper(a.theme) = upper(:theme))
          and (
            :search is null
            or lower(a.transliterationTr) like lower(concat('%', :search, '%'))
            or lower(a.meaningTr) like lower(concat('%', :search, '%'))
          )
    """)
    List<AsmaulHusna> searchActive(@Param("search") String search, @Param("theme") String theme);
}
