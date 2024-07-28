package com.stoyandev.caloriecalculator.service.ServiceImpl;

import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.WeightRecord;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.mapper.WeightRecordMapper;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WeightRecordRepository;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;


@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final WeightRecordRepository weightRecordRepository;

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
        Users user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Create and save new weight record
        WeightRecord weightRecord = new WeightRecord();
        weightRecord.setUser(user);
        weightRecord.setWeight(newWeight);
        weightRecord.setDate(LocalDate.now());
        weightRecordRepository.save(weightRecord);

        // Add weight record to user's weight records
        user.getWeightRecords().add(weightRecord);

        // Update user's weight
        user.setWeight(newWeight);
        userRepository.save(user);

        return UserMapper.mapToUserDTO(user);
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




    @Override
    public List<WeightRecordDTO> getWeightRecords(Long id) {
    final var user = userRepository
            .findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        return user.getWeightRecords().stream().map(WeightRecordMapper::toDTO).collect(Collectors.toList());
    }
}
