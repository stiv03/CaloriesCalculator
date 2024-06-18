package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping
public class ProductController {

    private final ProductService productService;

    public ProductController(final ProductService productService) {
        this.productService = productService;
    }

    @PostMapping("/new/product")
    public ResponseEntity<ProductDTO> createProduct(@RequestBody ProductDTO productDTO) {
        var savedProduct = productService.createProduct(productDTO);
        return new ResponseEntity<>(savedProduct, HttpStatus.CREATED);
    }

    @GetMapping("/all/products")
    public ResponseEntity<List<ProductDTO>> displayAllProducts() {
        var allProducts = productService.displayAllProducts();
        return new ResponseEntity<>(allProducts, HttpStatus.OK);
    }
}
