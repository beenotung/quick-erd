package com.example.javaproject.service;

import com.example.javaproject.dto.CreatePetDTO;
import com.example.javaproject.entity.PetEntity;
import com.example.javaproject.repository.PetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class PetService {
  @Autowired
  PetRepository petRepository;

  public PetEntity createPet(CreatePetDTO createPetDTO) {
    PetEntity pet = new PetEntity();
    pet.setType(createPetDTO.type);
    pet = petRepository.save(pet);
    return pet;
  }

  public PetEntity findPetByType(String type) {
    PetEntity pet = petRepository.findPetByType(type);
    return pet;
  }

  public Iterable<PetEntity> findAllPets() {
    return petRepository.findAll();
  }
}
