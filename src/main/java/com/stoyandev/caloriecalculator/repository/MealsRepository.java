package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.UserMeals;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MealsRepository extends JpaRepository<UserMeals, Long> {

    List<UserMeals> findAllByUserId(Long userId);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserMeals u WHERE u.id = :id")
    void deleteByUserMealsID(@Param("id") Long id);
}

