package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.entity.UsersProduct;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UsersProductRepository extends JpaRepository<UsersProduct,Long> {

    List<UsersProduct> findAllByUserId(Long Id);
}

