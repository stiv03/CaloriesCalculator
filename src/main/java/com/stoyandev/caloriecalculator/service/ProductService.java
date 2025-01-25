package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.enums.ProductType;

import java.util.List;

public interface ProductService {
    ProductDTO createProduct(ProductDTO productDTO);

    List<ProductDTO> searchProducts(String query);

    List<ProductDTO> displayAllProducts();
    List<ProductDTO> displayProductsByType(ProductType type);

    ProductDTO updateProductName(long id, String newWeight);

}
