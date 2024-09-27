package com.stoyandev.caloriecalculator.mapper;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.Product;

public final class ProductMapper {

    private ProductMapper() {
    }

    public static ProductDTO mapToProductDTO(Product product) {
        return new ProductDTO(
                product.getName(),
                product.getId(),
                product.getProductType(),
                product.getCaloriesPer100Grams(),
                product.getProteinPer100Grams(),
                product.getFatPer100Grams(),
                product.getCarbsPer100Grams()
        );
    }

    public static Product mapToProduct(ProductDTO productDTO) {
        var product = new Product();
        product.setName(productDTO.name());
        product.setProductType(productDTO.productType());
        product.setCaloriesPer100Grams(productDTO.caloriesPer100Grams());
        product.setProteinPer100Grams(productDTO.proteinPer100Grams());
        product.setFatPer100Grams(productDTO.fatPer100Grams());
        product.setCarbsPer100Grams(productDTO.carbsPer100Grams());
        return product;
    }
}
