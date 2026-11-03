/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.vet

import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.springframework.samples.petclinic.model.NamedEntity

/** Models a veterinarian's specialty (for example, dentistry). */
@Entity
@Table(name = "specialties")
open class Specialty : NamedEntity()
