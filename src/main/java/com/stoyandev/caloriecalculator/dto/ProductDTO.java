package com.stoyandev.caloriecalculator.dto;

import com.stoyandev.caloriecalculator.entity.ProductType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ProductDTO {

    private String name;
    private ProductType productType;
    private double caloriesPer100Grams;
    private double proteinPer100Grams;
    private double fatPer100Grams;
    private double carbsPer100Grams;
}
