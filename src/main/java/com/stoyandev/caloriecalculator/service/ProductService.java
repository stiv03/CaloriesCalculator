package com.stoyandev.caloriecalculator.service;

import com.stoyandev.caloriecalculator.dto.BarcodeLookupDTO;
import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.enums.ProductType;

import java.util.List;
import java.util.Optional;

public interface ProductService {
    ProductDTO createProduct(ProductDTO productDTO);

    List<ProductDTO> searchProducts(String query);

    List<ProductDTO> displayAllProducts();
    List<ProductDTO> displayProductsByType(ProductType type);

    ProductDTO updateProductName(long id, String newWeight);

    /**
     * Look up a product by barcode: our own DB first, then Open Food Facts.
     * Empty if neither has it.
     */
    Optional<BarcodeLookupDTO> lookupByBarcode(String barcode);

}
