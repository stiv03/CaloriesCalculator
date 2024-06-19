package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.UserMealsDTO;
import com.stoyandev.caloriecalculator.entity.Product;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.UsersProduct;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.UsersProductMapper;
import com.stoyandev.caloriecalculator.repository.ProductRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.UsersProductRepository;
import com.stoyandev.caloriecalculator.service.UsersProductService;
import lombok.AllArgsConstructor;
import java.util.Optional;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@AllArgsConstructor
public class UserProductServiceImpl implements UsersProductService {

    private final UsersProductRepository usersMealsRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;

    @Override
    public List<UserMealsDTO> findAllUserMealsRelForSpecificDay(final Long id, LocalDate date){
        var allMealsEaten = usersMealsRepository.findAllByUserId(id);
        // next filter them using streams api, for the given date.
        List<UserMealsDTO> mealsEatenForGivenDay = new ArrayList<>();
        for(var meal : allMealsEaten) {
            if (date.equals(meal.getConsumedAt().toLocalDate())) {
                mealsEatenForGivenDay.add(UsersProductMapper.mapToUserProductDTO(meal));
            }
        }
        return  mealsEatenForGivenDay;
    }

    @Override
    public double calculateTotalCaloriesForDay (final Long id, LocalDate date){
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(id, date);

        double totalCalories = 0;
        for (var userProduct : usersProduct){
            totalCalories += userProduct.getProduct().getCaloriesPer100Grams() * (userProduct.getQuantity()/100);
        }
        return totalCalories;
    }

    @Override
    public double calculateTotalProteinForDay (final Long id, LocalDate date){
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(id, date);

        double totalProtein = 0;
        for (var userProduct : usersProduct){
            totalProtein += userProduct.getProduct().getProteinPer100Grams() * (userProduct.getQuantity()/100);
        }
        return totalProtein;
    }
    @Override
    public double calculateTotalCarbsForDay (final Long id, LocalDate date){
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(id, date);

        double totalCarbs = 0;
        for (var userProduct : usersProduct){
            totalCarbs += userProduct.getProduct().getCarbsPer100Grams() * (userProduct.getQuantity()/100);
        }
        return totalCarbs;
    }

    @Override
    public double calculateTotalFatsForDay (final Long id, LocalDate date){
        List<UserMealsDTO> usersProduct = findAllUserMealsRelForSpecificDay(id, date);

        double totalFats = 0;
        for (var userProduct : usersProduct){
            totalFats += userProduct.getProduct().getFatPer100Grams() * (userProduct.getQuantity()/100);
        }
        return totalFats;
    }

    @Override
    public void addMealForUser(Long userId, Long productId, Integer grams) {
        UsersProduct newMeal = new UsersProduct();

        Users user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User Not found"));
        Optional<Product> product = productRepository.findById(productId);
        newMeal.setQuantity(grams);
        newMeal.setUser(user);
        newMeal.setProduct(product.orElseThrow(()-> new ResourceNotFoundException("Product not found")));
        newMeal.setConsumedAt(LocalDateTime.now());
        usersMealsRepository.save(newMeal);
    }


}
