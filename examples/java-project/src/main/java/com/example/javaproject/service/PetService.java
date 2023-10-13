package com.example.javaproject.service;

import com.example.javaproject.dto.CreatePetDTO;
import com.example.javaproject.model.Pet;
import com.example.javaproject.repository.PetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PetService {
  @Autowired
  PetRepository petRepository;

  public Pet createPet(CreatePetDTO createPetDTO) {
    Pet pet = new Pet();
    pet.setType(createPetDTO.type);
    pet = petRepository.save(pet);
    return pet;
  }

  public Pet findPetByType(String type) {
    Pet pet = petRepository.findPetByType(type);
    return pet;
  }

  public Iterable<Pet> findAllPets() {
    return petRepository.findAll();
  }
}
