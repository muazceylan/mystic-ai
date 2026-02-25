package com.mysticai.astrology.repository;

import com.mysticai.astrology.entity.StarMateLike;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StarMateLikeRepository extends JpaRepository<StarMateLike, Long> {

    Optional<StarMateLike> findByLikerIdAndLikedId(Long likerId, Long likedId);

    @Query("select l.likedId from StarMateLike l where l.likerId = :likerId")
    List<Long> findSwipedUserIdsByLikerId(@Param("likerId") Long likerId);
}
