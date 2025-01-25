package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.enums.ProductType;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.ProductMapper;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.service.ProductService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {
    private final ProductRepository productRepository;

    public ProductServiceImpl(final ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    public ProductDTO createProduct(ProductDTO productDTO) {
        var product = ProductMapper.mapToProduct(productDTO);
        var savedProduct = productRepository.save(product);
        return ProductMapper.mapToProductDTO(savedProduct);
    }

    @Override
    public List<ProductDTO> searchProducts(String query) {
        return productRepository.findByNameContainingIgnoreCase(query).stream().map(ProductMapper::mapToProductDTO).toList();
    }

    @Override
    public List<ProductDTO> displayAllProducts(){
        var allProducts = productRepository.findAll();
        List<ProductDTO> productDTOS = new ArrayList<>();

        for(var product : allProducts){
            productDTOS.add(ProductMapper.mapToProductDTO(product));
        }
        return productDTOS;
    }
    @Override
    public List<ProductDTO> displayProductsByType(ProductType type){
        var allProducts = productRepository.findAll();
        List<ProductDTO> productDTOS = new ArrayList<>();

        for(var product : allProducts) {
            if (product.getProductType().equals(type)) {
                productDTOS.add(ProductMapper.mapToProductDTO(product));
            }
        }
        return productDTOS;
    }

    public ProductDTO updateProductName(long id, String newName){
        final var product = productRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found" + id));
        product.setName(newName);
        final var savedProduct = productRepository.save(product);
        return ProductMapper.mapToProductDTO(savedProduct);
    }
}
