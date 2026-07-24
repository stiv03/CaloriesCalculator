package com.stoyandev.caloriecalculator.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import com.stoyandev.caloriecalculator.entity.enums.SupplementCategory;

@Entity
@Table(name = "supplement")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Supplement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;

    @Column(name = "name", nullable = false)
    private String name;

    /** Free-text dosage like "5000 IU" or "5g". Optional. */
    @Column(name = "dosage")
    private String dosage;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;

    /** Schedule type driving which days the supplement is "due". Nullable so
        ddl-auto=update can add the column to a table with existing rows; a null
        category is treated as DAILY everywhere (backfilled on startup). */
    @Enumerated(EnumType.STRING)
    @Column(name = "category")
    private SupplementCategory category = SupplementCategory.DAILY;
}
