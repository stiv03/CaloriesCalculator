package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserMeasurementsRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import com.stoyandev.caloriecalculator.entity.WeightRecord;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.MeasurementsRecordMapper;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.mapper.WeightRecordMapper;
import com.stoyandev.caloriecalculator.repository.MeasurementsRecordRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WeightRecordRepository;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;


@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final WeightRecordRepository weightRecordRepository;
    private MeasurementsRecordRepository measurementsRecordRepository;

    @Override
    public UserDTO createUser(UserDTO userDTO) {
        var user = UserMapper.mapToUser(userDTO);
        var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    public UserDTO getUserById(final Long id) {
        final var user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Not found"));
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
        final var user = userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("User not found" + id));

        var weightRecord = new WeightRecord();
        weightRecord.setUser(user);
        weightRecord.setWeight(newWeight);
        weightRecord.setDate(LocalDate.now());
        weightRecordRepository.save(weightRecord);

        user.getWeightRecords().add(weightRecord);
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
    public List<WeightRecordDTO> getWeightRecords(final Long id) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        return user.getWeightRecords().stream().map(WeightRecordMapper::toDTO).toList();
    }

    @Override
    public MeasurementsRecordDTO addMeasurement(final Long userId, UpdateUserMeasurementsRequestDTO requestDTO) {
        final var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with id: " + userId));
        var measurementsRecord = MeasurementsRecord.builder()
                .user(user)
                .shoulder(requestDTO.shoulder())
                .chest(requestDTO.chest())
                .biceps(requestDTO.biceps())
                .waist(requestDTO.waist())
                .hips(requestDTO.hips())
                .thigh(requestDTO.thigh())
                .calf(requestDTO.calf())
                .date(LocalDate.now())
                .build();
        var savedRecord = measurementsRecordRepository.save(measurementsRecord);

        return MeasurementsRecordMapper.toDTO(savedRecord);
    }

    @Override
    public List<MeasurementsRecordDTO> getMeasurementsByUser(final Long userId) {
        return measurementsRecordRepository.findByUserId(userId).stream().map(MeasurementsRecordMapper::toDTO).toList();
    }

    @Override
    public MeasurementsRecordDTO getLatestMeasurement(final Long userId) {
        return measurementsRecordRepository.findTopByUserIdOrderByDateDescIdDesc(userId);
    }
}
