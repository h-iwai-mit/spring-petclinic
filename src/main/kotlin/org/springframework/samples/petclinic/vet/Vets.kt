/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.vet

import jakarta.xml.bind.annotation.XmlElement
import jakarta.xml.bind.annotation.XmlRootElement
import java.util.ArrayList

/** A list wrapper used for JSON and XML marshalling. */
@XmlRootElement
open class Vets {

    private var vets: MutableList<Vet>? = null

    @XmlElement
    open fun getVetList(): MutableList<Vet> {
        var current = vets
        if (current == null) {
            current = ArrayList()
            vets = current
        }
        return current
    }
}
