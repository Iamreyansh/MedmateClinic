package com.medmate.clinic.grant;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * What a role may open.
 *
 * <p>One place decides this, so the menu and the API cannot disagree: the
 * capabilities come from the grants, and the frontend renders the nav from
 * exactly what the API returns.
 */
@Service
public class GrantService {

    private final RoleRepository roleRepository;
    private final GrantRepository grantRepository;
    private final RoleGrantRepository roleGrantRepository;

    public GrantService(
            RoleRepository roleRepository,
            GrantRepository grantRepository,
            RoleGrantRepository roleGrantRepository) {
        this.roleRepository = roleRepository;
        this.grantRepository = grantRepository;
        this.roleGrantRepository = roleGrantRepository;
    }

    /** The resource → level map for a role. */
    @Transactional(readOnly = true)
    public Map<String, String> capabilitiesFor(UUID clinicId, UUID roleId) {
        Map<String, String> capabilities = new LinkedHashMap<>();
        if (roleId == null) {
            return capabilities;
        }
        Role role = roleRepository.findById(roleId).orElse(null);
        if (role == null) {
            return capabilities;
        }
        if (role.isOwner()) {
            // The owner always has full access.
            List<Grant> grants = grantRepository.findAll().stream()
                    .filter(grant -> grant.getClinicId().equals(clinicId))
                    .toList();
            for (Grant grant : grants) {
                capabilities.put(grant.getResource(), grant.getLevel());
            }
            return capabilities;
        }
        List<RoleGrant> links = roleGrantRepository.findByIdRoleId(roleId);
        for (RoleGrant link : links) {
            Grant grant = grantRepository.findById(link.getId().grantId()).orElse(null);
            if (grant != null) {
                capabilities.put(grant.getResource(), grant.getLevel());
            }
        }
        return capabilities;
    }

    /** The resources a person may open, for the token. */
    @Transactional(readOnly = true)
    public List<String> resourcesFor(UUID clinicId, UUID roleId) {
        List<String> resources = new ArrayList<>();
        capabilitiesFor(clinicId, roleId).forEach((resource, level) -> {
            if (!"none".equals(level)) {
                resources.add(resource);
            }
        });
        return resources;
    }
}
