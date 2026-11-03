/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import jakarta.validation.Valid
import java.time.LocalDate
import org.springframework.stereotype.Controller
import org.springframework.validation.BindingResult
import org.springframework.web.bind.WebDataBinder
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.InitBinder
import org.springframework.web.bind.annotation.ModelAttribute
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.servlet.mvc.support.RedirectAttributes

@Controller
class VisitController(private val owners: OwnerRepository) {

    @InitBinder
    fun setAllowedFields(dataBinder: WebDataBinder) {
        dataBinder.setDisallowedFields("id", "*.id")
    }

    @ModelAttribute("visit")
    fun loadPetWithVisit(
        @PathVariable("ownerId") ownerId: Int,
        @PathVariable("petId") petId: Int,
        model: MutableMap<String, Any>,
    ): Visit {
        val owner = owners.findById(ownerId).orElseThrow {
            IllegalArgumentException("Owner not found with id: $ownerId. Please ensure the ID is correct ")
        }
        val pet = owner.getPet(petId)
            ?: throw IllegalArgumentException("Pet with id $petId not found for owner with id $ownerId.")
        model["pet"] = pet
        model["owner"] = owner
        val visit = Visit()
        pet.addVisit(visit)
        return visit
    }

    @ModelAttribute("minVisitDate")
    fun minVisitDate(): LocalDate = LocalDate.now().plusDays(1)

    @GetMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun initNewVisitForm(): String = "pets/createOrUpdateVisitForm"

    @PostMapping("/owners/{ownerId}/pets/{petId}/visits/new")
    fun processNewVisitForm(
        @ModelAttribute owner: Owner,
        @PathVariable petId: Int,
        @Valid visit: Visit,
        result: BindingResult,
        redirectAttributes: RedirectAttributes,
    ): String {
        if (visit.date != null && !visit.date!!.isAfter(LocalDate.now())) {
            result.rejectValue("date", "typeMismatch.visitDate")
        }
        if (result.hasErrors()) {
            return "pets/createOrUpdateVisitForm"
        }
        owner.addVisit(petId, visit)
        owners.save(owner)
        redirectAttributes.addFlashAttribute("message", "Your visit has been booked")
        return "redirect:/owners/{ownerId}"
    }
}
