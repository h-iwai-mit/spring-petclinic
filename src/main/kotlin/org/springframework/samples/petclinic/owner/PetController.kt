/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import jakarta.validation.Valid
import java.time.LocalDate
import java.util.Locale
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.stereotype.Controller
import org.springframework.ui.ModelMap
import org.springframework.util.Assert
import org.springframework.util.StringUtils
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
@RequestMapping("/owners/{ownerId}")
class PetController(
    private val owners: OwnerRepository,
    private val types: PetTypeRepository,
) {

    @ModelAttribute("types")
    fun populatePetTypes(): Collection<PetType> = types.findPetTypes()

    @ModelAttribute("owner")
    fun findOwner(@PathVariable("ownerId") ownerId: Int): Owner =
        owners.findById(ownerId).orElseThrow {
            IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        }

    @ModelAttribute("pet")
    fun findPet(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable(name = "petId", required = false) petId: Int?,
    ): Pet? {
        if (petId == null) {
            return Pet()
        }
        val owner = owners.findById(ownerId).orElseThrow {
            IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        }
        return owner.getPet(petId)
    }

    @InitBinder("owner")
    fun initOwnerBinder(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id", "*.id")
    }

    @InitBinder("pet")
    fun initPetBinder(dataBinder: WebDataBinder) {
        dataBinder.validator = PetValidator()
        dataBinder.setDisallowedFields("id", "*.id")
    }

    @GetMapping("/pets/new")
    fun initCreationForm(owner: Owner, model: ModelMap): String {
        owner.addPet(Pet())
        return VIEWS_PETS_CREATE_OR_UPDATE_FORM
    }

    @PostMapping("/pets/new")
    fun processCreationForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes,
    ): String {
        if (StringUtils.hasText(pet.name) && pet.isNew() && owner.getPet(pet.name, true) != null) {
            result.rejectValue("name", "duplicate", "already exists")
        }
        if (pet.birthDate != null && pet.birthDate!!.isAfter(LocalDate.now())) {
            result.rejectValue("birthDate", "typeMismatch.birthDate")
        }
        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }
        try {
            owner.addPet(pet)
            owners.saveAndFlush(owner)
        } catch (ex: DataIntegrityViolationException) {
            if (!isDuplicatePetNameViolation(ex)) {
                throw ex
            }
            result.rejectValue("name", "duplicate", "already exists")
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }
        redirectAttributes.addFlashAttribute("message", "New Pet has been Added")
        return "redirect:/owners/{ownerId}"
    }

    @GetMapping("/pets/{petId}/edit")
    fun initUpdateForm(): String = VIEWS_PETS_CREATE_OR_UPDATE_FORM

    @PostMapping("/pets/{petId}/edit")
    fun processUpdateForm(
        owner: Owner,
        @Valid pet: Pet,
        result: BindingResult,
        redirectAttributes: RedirectAttributes,
    ): String {
        val petName = pet.name
        if (StringUtils.hasText(petName)) {
            val existingPet = owner.getPet(petName, false)
            if (existingPet != null && existingPet.id != pet.id) {
                result.rejectValue("name", "duplicate", "already exists")
            }
        }
        if (pet.birthDate != null && pet.birthDate!!.isAfter(LocalDate.now())) {
            result.rejectValue("birthDate", "typeMismatch.birthDate")
        }
        if (result.hasErrors()) {
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }
        try {
            updatePetDetails(owner, pet)
        } catch (ex: DataIntegrityViolationException) {
            if (!isDuplicatePetNameViolation(ex)) {
                throw ex
            }
            result.rejectValue("name", "duplicate", "already exists")
            return VIEWS_PETS_CREATE_OR_UPDATE_FORM
        }
        redirectAttributes.addFlashAttribute("message", "Pet details has been edited")
        return "redirect:/owners/{ownerId}"
    }

    private fun updatePetDetails(owner: Owner, pet: Pet) {
        val id = pet.id
        Assert.state(id != null, "'pet.getId()' must not be null")
        val existingPet = owner.getPet(id)
        if (existingPet != null) {
            existingPet.name = pet.name
            existingPet.birthDate = pet.birthDate
            existingPet.type = pet.type
        } else {
            owner.addPet(pet)
        }
        owners.saveAndFlush(owner)
    }

    private fun isDuplicatePetNameViolation(ex: DataIntegrityViolationException): Boolean =
        ex.message?.lowercase(Locale.getDefault())?.contains("unique_owner_pet_name") == true

    private companion object {
        const val VIEWS_PETS_CREATE_OR_UPDATE_FORM = "pets/createOrUpdatePetForm"
    }
}
