package com.example.javaproject.repository;

import com.example.javaproject.model.Pet;
import org.springframework.data.repository.CrudRepository;

public interface PetRepository extends CrudRepository<Pet, Long> {
  Pet findPetByType(String type);
}
