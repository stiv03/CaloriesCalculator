package com.stoyandev.caloriecalculator.service.implementations;

import com.stoyandev.caloriecalculator.dto.MealTemplateRequestDTO;
import com.stoyandev.caloriecalculator.dto.MealTemplateResponseDTO;
import com.stoyandev.caloriecalculator.entity.MealTemplate;
import com.stoyandev.caloriecalculator.entity.MealTemplateItem;
import com.stoyandev.caloriecalculator.entity.Users;
import com.stoyandev.caloriecalculator.exception.ResourceNotFoundException;
import com.stoyandev.caloriecalculator.repository.MealTemplateItemRepository;
import com.stoyandev.caloriecalculator.repository.MealTemplateRepository;
import com.stoyandev.caloriecalculator.repository.UserRepository;
import com.stoyandev.caloriecalculator.service.MealTemplateService;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@AllArgsConstructor
@Transactional
public class MealTemplateServiceImpl implements MealTemplateService {

    private final MealTemplateRepository templateRepository;
    private final MealTemplateItemRepository itemRepository;
    private final UserRepository userRepository;

    @Override
    public List<MealTemplateResponseDTO> getTemplatesForUser(Long userId) {
        return templateRepository.findAllByUserId(userId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Override
    public MealTemplateResponseDTO createTemplate(Long userId, MealTemplateRequestDTO request) {
        Users user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        MealTemplate template = MealTemplate.builder()
                .user(user)
                .name(request.name())
                .build();

        List<MealTemplateItem> items = request.items().stream()
                .map(i -> MealTemplateItem.builder()
                        .template(template)
                        .productId(i.productId())
                        .productName(i.productName())
                        .grams(i.grams())
                        .caloriesPer100Grams(i.caloriesPer100Grams())
                        .build())
                .toList();

        template.getItems().addAll(items);
        return toDTO(templateRepository.save(template));
    }

    @Override
    public void deleteTemplate(Long userId, Long templateId) {
        MealTemplate template = getOwnedTemplate(userId, templateId);
        templateRepository.delete(template);
    }

    @Override
    public MealTemplateResponseDTO addItemToTemplate(Long userId, Long templateId, MealTemplateRequestDTO.MealTemplateItemDTO item) {
        MealTemplate template = getOwnedTemplate(userId, templateId);
        MealTemplateItem newItem = MealTemplateItem.builder()
                .template(template)
                .productId(item.productId())
                .productName(item.productName())
                .grams(item.grams())
                .caloriesPer100Grams(item.caloriesPer100Grams())
                .build();
        template.getItems().add(newItem);
        return toDTO(templateRepository.save(template));
    }

    @Override
    public MealTemplateResponseDTO updateItemGrams(Long userId, Long templateId, Long itemId, Integer grams) {
        MealTemplate template = getOwnedTemplate(userId, templateId);
        MealTemplateItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item not found"));
        item.setGrams(grams);
        itemRepository.save(item);
        return toDTO(template);
    }

    @Override
    public MealTemplateResponseDTO removeItemFromTemplate(Long userId, Long templateId, Long itemId) {
        MealTemplate template = getOwnedTemplate(userId, templateId);
        template.getItems().removeIf(i -> i.getId().equals(itemId));
        return toDTO(templateRepository.save(template));
    }

    private MealTemplate getOwnedTemplate(Long userId, Long templateId) {
        MealTemplate template = templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        if (!template.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Template not found");
        }
        return template;
    }

    private MealTemplateResponseDTO toDTO(MealTemplate t) {
        List<MealTemplateResponseDTO.MealTemplateItemDTO> items = t.getItems().stream()
                .map(i -> new MealTemplateResponseDTO.MealTemplateItemDTO(
                        i.getId(), i.getProductId(), i.getProductName(),
                        i.getGrams(), i.getCaloriesPer100Grams()))
                .toList();
        return new MealTemplateResponseDTO(t.getId(), t.getName(), items);
    }
}
