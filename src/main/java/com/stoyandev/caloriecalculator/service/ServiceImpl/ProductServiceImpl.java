package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.Product;
import com.stoyandev.caloriecalculator.mapper.ProductMapper;
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
    public List<ProductDTO> displayAllProducts() {
        var listOfProducts = productRepository.findAll();

        List<ProductDTO> newlist = new ArrayList<>();

        for (Product product : listOfProducts) {
            var convertedProduct = ProductMapper.mapToProductDTO(product);
            newlist.add(convertedProduct);
        }
        return newlist;

    }


}
