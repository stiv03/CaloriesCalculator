package com.stoyandev.caloriecalculator.controller;

import com.stoyandev.caloriecalculator.dto.UpdateUserAgeRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserHeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UpdateUserWeightRequestDTO;
import com.stoyandev.caloriecalculator.dto.UserDTO;
import com.stoyandev.caloriecalculator.service.UserService;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping
@AllArgsConstructor
public class UserController {

    private UserService userService;

    @PostMapping("/new/user")
    public ResponseEntity<UserDTO> createUser(@RequestBody UserDTO userDTO) {
        var savedUSer = userService.createUser(userDTO);
        return new ResponseEntity<>(savedUSer, HttpStatus.CREATED);

    }

    @PutMapping("/update/age/{id}")
    public ResponseEntity<UserDTO> updateAge(@PathVariable Long id, @RequestBody UpdateUserAgeRequestDTO userAgeRequestDTO) {
        var updatedUser = userService.updateAge(id, userAgeRequestDTO.newAge());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/weight/{id}")
    public ResponseEntity<UserDTO> updateWeight(@PathVariable Long id, @RequestBody UpdateUserWeightRequestDTO userWeightRequestDTO) {
        var updatedUser = userService.updateWeight(id, userWeightRequestDTO.newWeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/update/height/{id}")
    public ResponseEntity<UserDTO> updateHeight(@PathVariable Long id, @RequestBody UpdateUserHeightRequestDTO userHeightRequestDTO) {
        var updatedUser = userService.updateHeight(id, userHeightRequestDTO.newHeight());
        return ResponseEntity.ok(updatedUser);
    }

    @PutMapping("/delete/user/{id}")
    public ResponseEntity<Void> deleteByUserID(@PathVariable Long id) {
        userService.deleteByUserID(id);
        return ResponseEntity.ok().build();
    }
}
