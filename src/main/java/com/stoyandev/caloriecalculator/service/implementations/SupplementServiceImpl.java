package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.SupplementDTO;
import com.stoyandev.caloriecalculator.dto.SupplementIntakeDTO;
import com.stoyandev.caloriecalculator.entity.Supplement;
import com.stoyandev.caloriecalculator.entity.SupplementIntake;
import com.stoyandev.caloriecalculator.entity.enums.SupplementCategory;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.mapper.SupplementMapper;
import com.stoyandev.caloriecalculator.repository.SupplementIntakeRepository;
import com.stoyandev.caloriecalculator.repository.SupplementRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.service.SupplementService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import jakarta.annotation.PostConstruct;

import java.time.LocalDate;
import java.util.List;

@Service
@AllArgsConstructor
public class SupplementServiceImpl implements SupplementService {

    private final SupplementRepository supplementRepository;
    private final SupplementIntakeRepository intakeRepository;
    private final UserRepository userRepository;

    @PostConstruct
    @Transactional
    public void backfillSortOrder() {
        supplementRepository.findAll().stream()
                .filter(s -> s.getSortOrder() == null)
                .forEach(s -> { s.setSortOrder(s.getId().intValue()); supplementRepository.save(s); });
    }

    @PostConstruct
    @Transactional
    public void backfillCategory() {
        supplementRepository.findAll().stream()
                .filter(s -> s.getCategory() == null)
                .forEach(s -> { s.setCategory(SupplementCategory.DAILY); supplementRepository.save(s); });
    }

    /** Parse a category name, defaulting to DAILY for null/blank/unknown values. */
    private static SupplementCategory parseCategory(String category) {
        if (category == null || category.isBlank()) return SupplementCategory.DAILY;
        try {
            return SupplementCategory.valueOf(category.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return SupplementCategory.DAILY;
        }
    }

    @Override
    public List<SupplementDTO> listSupplements(Long userId) {
        return supplementRepository.findByUserIdOrderBySortOrderAscIdAsc(userId).stream()
                .map(SupplementMapper::toDto)
                .toList();
    }

    @Override
    public SupplementDTO createSupplement(Long userId, String name, String dosage, String category) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required");
        }
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        var s = new Supplement();
        s.setUser(user);
        s.setName(name.trim());
        s.setDosage(dosage == null || dosage.isBlank() ? null : dosage.trim());
        s.setCategory(parseCategory(category));
        return SupplementMapper.toDto(supplementRepository.save(s));
    }

    @Override
    public SupplementDTO updateSupplement(Long userId, Long supplementId, String name, String dosage, String category) {
        var s = ownedSupplement(userId, supplementId);
        if (name != null && !name.isBlank()) s.setName(name.trim());
        s.setDosage(dosage == null || dosage.isBlank() ? null : dosage.trim());
        s.setCategory(parseCategory(category));
        return SupplementMapper.toDto(supplementRepository.save(s));
    }

    @Override
    public void deleteSupplement(Long userId, Long supplementId) {
        var s = ownedSupplement(userId, supplementId);
        // Delete child intakes first or the FK constraint will reject the parent delete.
        // (No cascade on the @ManyToOne — keep the data model explicit.)
        intakeRepository.deleteBySupplementId(supplementId);
        supplementRepository.delete(s);
    }

    @Override
    public List<SupplementIntakeDTO> listIntakes(Long userId, LocalDate from, LocalDate to) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date range");
        }
        return intakeRepository.findBySupplementUserIdAndDateBetween(userId, from, to).stream()
                .map(SupplementMapper::toDto)
                .toList();
    }

    @Override
    public SupplementIntakeDTO setIntake(Long userId, Long supplementId, LocalDate date, boolean taken) {
        if (date == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Date is required");
        }
        if (!date.equals(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Can only edit today's intake");
        }
        var s = ownedSupplement(userId, supplementId);

        var intake = intakeRepository.findBySupplementIdAndDate(supplementId, date)
                .orElseGet(() -> {
                    var i = new SupplementIntake();
                    i.setSupplement(s);
                    i.setDate(date);
                    return i;
                });
        intake.setTaken(taken);
        return SupplementMapper.toDto(intakeRepository.save(intake));
    }

    @Override
    public void reorder(Long userId, List<Long> orderedIds) {
        for (int i = 0; i < orderedIds.size(); i++) {
            var s = ownedSupplement(userId, orderedIds.get(i));
            s.setSortOrder(i);
            supplementRepository.save(s);
        }
    }

    private Supplement ownedSupplement(Long userId, Long supplementId) {
        var s = supplementRepository.findById(supplementId)
                .orElseThrow(() -> new ResourceNotFoundException("Supplement not found"));
        if (!s.getUser().getId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your supplement");
        }
        return s;
    }
}
