/*
 * Copyright 2012-2025 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package org.springframework.samples.petclinic.system

import org.springframework.stereotype.Controller
import org.springframework.web.bind.annotation.GetMapping

/** Controller used to showcase what happens when an exception is thrown. */
@Controller
class CrashController {

    @GetMapping("/oups")
    fun triggerException(): String {
        throw RuntimeException("Expected: controller used to showcase what happens when an exception is thrown")
    }
}
