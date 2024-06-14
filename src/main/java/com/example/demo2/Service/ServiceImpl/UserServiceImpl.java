package com.example.demo2.Service.ServiceImpl;

import com.example.demo2.DTO.UserDTO;
import com.example.demo2.Entity.Users;
import com.example.demo2.Mapper.UserMapper;
import com.example.demo2.Repository.UserRepository;
import com.example.demo2.Service.UserService;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor

public class UserServiceImpl implements UserService {
    private UserRepository userRepository;
    @Override
    public UserDTO createUser(UserDTO userDTO) {

        Users user = UserMapper.mapToUser(userDTO);
        Users savedUser = userRepository.save(user);
        return UserMapper.mapToUserDTO(savedUser);
    }
}
