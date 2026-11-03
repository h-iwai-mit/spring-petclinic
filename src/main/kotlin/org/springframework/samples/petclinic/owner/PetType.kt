/*
 * Copyright 2012-2025 the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.samples.petclinic.owner

import jakarta.persistence.Entity
import jakarta.persistence.Table
import org.springframework.samples.petclinic.model.NamedEntity

@Entity
@Table(name = "types")
open class PetType : NamedEntity()
