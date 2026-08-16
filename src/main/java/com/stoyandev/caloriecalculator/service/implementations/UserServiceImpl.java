package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.MeasurementsRecordDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserMeasurementsRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.dto.WeightRecordDTO;
import com.stoyandev.caloriecalculator.entity.MeasurementsRecord;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.entity.WeightRecord;
import com.stoyandev.caloriecalculator.entity.enums.Activity;
import com.stoyandev.caloriecalculator.entity.enums.Status;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.MeasurementsRecordMapper;
import com.stoyandev.caloriecalculator.mapper.UserMapper;
import com.stoyandev.caloriecalculator.mapper.WeightRecordMapper;
import com.stoyandev.caloriecalculator.repository.GoalRepository;
import com.stoyandev.caloriecalculator.repository.MealsRepository;
import com.stoyandev.caloriecalculator.repository.MeasurementsRecordRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.repository.WeightRecordRepository;
import com.stoyandev.caloriecalculator.service.UserService;
import jakarta.transaction.Transactional;
import lombok.AllArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;


@Service
@AllArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final WeightRecordRepository weightRecordRepository;
    private final MeasurementsRecordRepository measurementsRecordRepository;
    private final MealsRepository mealsRepository;
    private final GoalRepository goalRepository;
    private final PasswordEncoder passwordEncoder;

    private final Clock clock = Clock.systemDefaultZone();

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

    @Transactional
    public UserDTO updateWeight(final long id, final double newWeight, final java.time.LocalTime measureTime) {
        final var user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found " + id));

        final var today = LocalDate.now(clock);

        final var weightRecord = weightRecordRepository
                .findByUserIdAndDate(id, today)
                .orElseGet(() -> {
                    var wr = new WeightRecord();
                    wr.setUser(user);
                    wr.setDate(today);
                    return wr;
                });

        weightRecord.setWeight(newWeight);
        weightRecord.setMeasureTime(measureTime);
        weightRecordRepository.save(weightRecord);

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
    public UserDTO updateGoalWeight(final long id, final Double goalWeight) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setGoalWeight(goalWeight);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateStartWeight(final long id, final Double startWeight) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        user.setStartWeight(startWeight);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateWaterGoal(final long id, final Integer waterGoalMl) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        // Clamp to non-negative; null clears the goal.
        user.setWaterGoalMl(waterGoalMl == null ? null : Math.max(0, waterGoalMl));
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateCheckInDay(final long id, final Integer checkInDay) {
        final var user = userRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found" + id));
        // Accept only a valid ISO day-of-week (1=Mon … 7=Sun); anything else clears it.
        user.setCheckInDay(checkInDay != null && checkInDay >= 1 && checkInDay <= 7 ? checkInDay : null);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }



    @Override
    public UserDTO updateStatus (final Long userId, Status status){
        final Users user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setStatus(status);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }

    @Override
    public UserDTO updateActivity (final Long userId, Activity activity){
        final var user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setActivity(activity);
        final var savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }


    /**
     * Deletes a user and every row that references them. The schema has no
     * ON DELETE CASCADE, so we delete dependants explicitly here. Order matters
     * only for FK integrity — children before parent.
     */
    @Override
    @Transactional
    public void deleteByUserID(long id) {
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found: " + id);
        }
        mealsRepository.deleteAllByUserId(id);
        weightRecordRepository.deleteAllByUserId(id);
        measurementsRecordRepository.deleteAllByUserId(id);
        goalRepository.deleteByUserId(id);
        userRepository.deleteByUserID(id);
    }


    @Override
    public List<WeightRecordDTO> getWeightRecords(final Long id) {
        return weightRecordRepository.findByUserId(id).stream().map(WeightRecordMapper::toDTO).toList();
    }

    @Override
    public MeasurementsRecordDTO addMeasurement(final Long userId, UpdateUserMeasurementsRequestDTO requestDTO) {
        final var user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
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
        return measurementsRecordRepository
                .findByUserId(userId).stream().map(MeasurementsRecordMapper::toDTO).toList();
    }

    @Override
    public MeasurementsRecordDTO getLatestMeasurement(final Long userId) {
        return measurementsRecordRepository.findTopByUserIdOrderByDateDescIdDesc(userId);
    }

    @Override
    public void updatePassword(final Long userId, final String newPassword) {
        final var user = userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }


}
