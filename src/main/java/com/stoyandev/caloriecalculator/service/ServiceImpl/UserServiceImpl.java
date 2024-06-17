package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.UpdateUserAgeRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserHeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserWeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;

    @Override
    public UserDTO createUser(UserDTO userDTO) {

        var user = UserMapper.mapToUser(userDTO);
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }


    @Override
    public UserDTO updateAge(final long id, UpdateUserAgeRequestDTO updatedUserAge) {
        var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setAge(updatedUserAge.newAge());
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateWeight(long id, UpdateUserWeightRequestDTO updatedUserWeight) {
        var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setWeight(updatedUserWeight.newWeight());
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateHeight(long id, UpdateUserHeightRequestDTO updatedUserHeight) {
        var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setHeight(updatedUserHeight.newHeight());
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }


}
