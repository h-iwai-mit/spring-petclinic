/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Table
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size
import java.time.LocalDate
import org.springframework.format.annotation.DateTimeFormat
import org.springframework.samples.petclinic.model.BaseEntity

@Entity
@Table(name = "visits")
open class Visit : BaseEntity() {

    @field:Column(name = "visit_date")
    @field:DateTimeFormat(pattern = "yyyy-MM-dd")
    open var date: LocalDate? = LocalDate.now().plusDays(1)

    @field:NotBlank
    @field:Size(max = 255)
    open var description: String? = null
}
