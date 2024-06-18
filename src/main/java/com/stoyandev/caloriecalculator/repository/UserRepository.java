package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Users;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM Users u WHERE u.id = :id")
    void deleteByUserID(@Param("id") Long id);
}
