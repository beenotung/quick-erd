package com.example.javaproject.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "`user_pet`")
public class UserPetEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.AUTO)
  @Column
  private Long id;

  @Column(name = "`user_id`", nullable = false)
  private String userId;

  @Column(name = "`pet_id`", nullable = false)
  private String petId;
}
