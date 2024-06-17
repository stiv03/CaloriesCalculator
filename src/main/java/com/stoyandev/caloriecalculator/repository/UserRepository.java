package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.Users;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<Users, Long> {
}
