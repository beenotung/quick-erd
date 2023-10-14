package com.example.javaproject.entity;

import lombok.Data;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Column;

@Entity
@Data
@Table(name = "`user_pet`")
public class UserPetEntity {
  @Id
  @GeneratedValue
  @Column
  private Long id;

  @Column(name = "`user_id`", nullable = false)
  private Long userId;

  @Column(name = "`pet_id`", nullable = false)
  private Long petId;
}
