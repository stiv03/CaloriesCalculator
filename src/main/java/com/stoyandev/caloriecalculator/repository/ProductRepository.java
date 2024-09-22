package com.stoyandev.caloriecalculator.repository;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {
    //todo: what the fuck is this shit
    //-> it's from Spring Data JPA Query Derivation -> it generate a query based on the keywords
    //SELECT * FROM product WHERE LOWER(name) LIKE LOWER('%input_name%')
    List<Product> findByNameContainingIgnoreCase(String name);
}



