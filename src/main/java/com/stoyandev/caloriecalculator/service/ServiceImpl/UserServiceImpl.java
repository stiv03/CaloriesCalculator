package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.entity.Users;
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

    public UserDTO getUserById(Long id) {
        Users user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
        return UserMapper.mapToUserDTO(user);
    }

    @Override
    public UserDTO updateAge(final long id, final int newAge) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setAge(newAge);
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateWeight(final long id, final double newWeight) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setWeight(newWeight);
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateHeight(final long id, final int newHeight) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setHeight(newHeight);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public void deleteByUserID(long id) {
        userRepository.deleteByUserID(id);
    }
}
