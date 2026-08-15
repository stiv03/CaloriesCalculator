package com.stoyandev.caloriecalculator.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.stoyandev.caloriecalculator.entity.enums.*;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Entity
@Table
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Users implements UserDetails {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Max(value = 100, message = "User can not be more than 100 years old")
    @Positive
    @Column(name = "age", length = 3, nullable = false)
    private int age;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender")
    private GenderType genderType;

    @Max(value = 350, message = "Invalid data")
    @Positive
    @Column(name = "weight", length = 3, nullable = false)
    private double weight;

    @Max(value = 250, message = "Invalid data")
    @Positive
    @Column(name = "height", length = 3, nullable = false)
    private int height;

    /** Optional target weight for the ETA projection. Nullable so ddl-auto=update
        can add the column to a table with existing rows. */
    @Column(name = "goal_weight")
    private Double goalWeight;

    /** Optional starting weight — the fixed baseline the goal progress bar fills from. */
    @Column(name = "start_weight")
    private Double startWeight;

    /** Optional daily water intake goal in millilitres. Nullable so ddl-auto=update
        can add the column to a table with existing rows. */
    @Column(name = "water_goal_ml")
    private Integer waterGoalMl;

    /** Weekly check-in day (ISO day-of-week: 1=Mon … 7=Sun) on which the calendar
        surfaces "log measurements" / "take a progress photo" events. Nullable →
        treated as Sunday(7) until the user picks one. */
    @Column(name = "check_in_day")
    private Integer checkInDay;

    @Column(name = "username", length = 100, nullable = false, unique = true)
    private String username;

    @Column(name = "password", length = 100, nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_type", nullable = false)
    private UserType userType;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_activity", nullable = false, columnDefinition = "VARCHAR(255) DEFAULT 'NORMAL'")
    private Activity activity;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_status", nullable = false, columnDefinition = "VARCHAR(255) DEFAULT 'MAINTAINING'")
    private Status status;


    @JsonIgnore
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority(userType.name()));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}