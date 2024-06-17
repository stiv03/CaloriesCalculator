package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.ProductDTO;

import java.util.List;

public interface ProductService {

    ProductDTO createProduct(ProductDTO productDTO);

    List<ProductDTO> displayAllProducts();
}
