package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.Product;

public class ProductMapper {

    private ProductMapper() {
    }

    public static ProductDTO mapToProductDTO(Product product) {
        return new ProductDTO(
                product.getName(),
                product.getProductType(),
                product.getCaloriesPer100Grams(),
                product.getProteinPer100Grams(),
                product.getFatPer100Grams(),
                product.getCarbsPer100Grams()
        );
    }

    public static Product mapToProduct(ProductDTO productDTO) {
        var product = new Product();
        product.setName(productDTO.getName());
        product.setProductType(productDTO.getProductType());
        product.setCaloriesPer100Grams(productDTO.getCaloriesPer100Grams());
        product.setProteinPer100Grams(productDTO.getProteinPer100Grams());
        product.setFatPer100Grams(productDTO.getFatPer100Grams());
        product.setCarbsPer100Grams(productDTO.getCarbsPer100Grams());
        return product;
    }
}
