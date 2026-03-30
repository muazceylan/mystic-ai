package com.mysticai.notification.tutorial.repository;

import com.mysticai.notification.tutorial.entity.TutorialConfig;
import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TutorialConfigRepository extends JpaRepository<TutorialConfig, Long>, JpaSpecificationExecutor<TutorialConfig> {

    @Override
    @EntityGraph(attributePaths = {"steps"})
    Optional<TutorialConfig> findById(Long id);

    Optional<TutorialConfig> findByTutorialId(String tutorialId);

    boolean existsByTutorialId(String tutorialId);

    boolean existsByTutorialIdAndIdNot(String tutorialId, Long id);

    List<TutorialConfig> findByTutorialIdAndStatusAndIdNot(String tutorialId, TutorialConfigStatus status, Long id);

    @Query("""
            select distinct tc
            from TutorialConfig tc
            left join fetch tc.steps steps
            where (:publishedOnly = false or tc.status = :publishedStatus)
              and (:onlyActive = false or tc.isActive = true)
              and (:screenKey is null or tc.screenKey = :screenKey)
              and (
                    :locale is null
                    or tc.locale is null
                    or lower(tc.locale) = :locale
                    or lower(tc.locale) like concat(:locale, '-%')
              )
              and tc.platform in :platforms
            """)
    List<TutorialConfig> findForPublicRead(
            @Param("platforms") Collection<TutorialPlatform> platforms,
            @Param("screenKey") String screenKey,
            @Param("locale") String locale,
            @Param("onlyActive") boolean onlyActive,
            @Param("publishedOnly") boolean publishedOnly,
            @Param("publishedStatus") TutorialConfigStatus publishedStatus
    );
}
