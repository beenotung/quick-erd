package com.example.javaproject.repository;

import com.example.javaproject.entity.PetEntity;
import org.springframework.data.repository.CrudRepository;

public interface PetRepository extends CrudRepository<PetEntity, Long> {
  PetEntity findPetByType(String type);
}
