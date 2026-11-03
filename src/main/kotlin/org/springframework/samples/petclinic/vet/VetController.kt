/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.vet

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Controller
import org.springframework.ui.Model
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseBody
import org.springframework.web.servlet.mvc.support.RedirectAttributes
import kotlin.math.max

@Controller
class VetController(private val vetRepository: VetRepository) {

    @GetMapping("/vets.html")
    fun showVetList(
        @RequestParam(defaultValue = "1") page: Int,
        model: Model,
        redirectAttributes: RedirectAttributes,
    ): String {
        val paginated = findPaginated(page)
        if (page < 1 || page > max(paginated.totalPages, 1)) {
            redirectAttributes.addAttribute("page", 1)
            return "redirect:/vets.html"
        }
        return addPaginationModel(page, paginated, model)
    }

    private fun addPaginationModel(page: Int, paginated: Page<Vet>, model: Model): String {
        model.addAttribute("currentPage", page)
        model.addAttribute("totalPages", paginated.totalPages)
        model.addAttribute("totalItems", paginated.totalElements)
        model.addAttribute("listVets", paginated.content)
        return "vets/vetList"
    }

    private fun findPaginated(page: Int): Page<Vet> {
        val pageSize = 5
        val safePage = max(page, 1)
        return vetRepository.findAll(PageRequest.of(safePage - 1, pageSize))
    }

    @GetMapping("/vets")
    @ResponseBody
    fun showResourcesVetList(): Vets {
        val vets = Vets()
        vets.getVetList().addAll(vetRepository.findAll())
        return vets
    }
}
