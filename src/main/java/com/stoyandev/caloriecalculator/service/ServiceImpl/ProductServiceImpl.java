package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.ProductDTO;
import com.stoyandev.caloriecalculator.entity.Product;
import com.stoyandev.caloriecalculator.entity.enums.ProductType;
import com.stoyandev.caloriecalculator.mapper.ProductMapper;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.service.ProductService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
//todo: dependancy injection(find all types: field, constructor, function)
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

    @Override
    public List<ProductDTO> filterByType(ProductType type) {
        var allProducts = productRepository.findAll();
        List<ProductDTO> filteredProduct = new ArrayList<>();
        for (var product : allProducts) {
            if (type.equals(product.getProductType())) {
                filteredProduct.add(ProductMapper.mapToProductDTO(product));

            }
        }
        return filteredProduct;
    }
    @Override
    public List<ProductDTO> searchProducts(String query) {
        return productRepository.findByNameContainingIgnoreCase(query).stream().map(ProductMapper::mapToProductDTO).toList();
    }


}
