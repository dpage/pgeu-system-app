# PGConf Scanner App - React Native Documentation

**Note:** Offline mode has been removed from requirements. All scanning operations require active network connectivity.

## Overview

Complete technical documentation for building a cross-platform conference scanner app with React Native. This replaces an existing Android-only app with enhanced iOS support.

## Documentation Structure

### 1. [Architecture](./architecture.md)
**Complete technical architecture and design decisions**

Topics covered:
- Technology stack selection and rationale
- Application architecture (service-oriented)
- Component hierarchy and navigation structure
- State management strategy (Zustand + React Query)
- API client architecture
- Performance optimization approach
- Security architecture
- 12-week implementation roadmap overview

**Read this first** to understand the overall system design.

### 2. [Project Structure](./project-structure.md)
**Code organization, folder structure, and patterns**

Topics covered:
- Complete directory structure with examples
- File and folder naming conventions
- Component structure patterns
- Screen structure patterns
- Custom hook patterns
- Platform-specific code isolation
- Import path aliases configuration
- Export patterns and barrel exports
- Style organization
- Testing file placement

**Use this** as a reference when creating new files and organizing code.

### 3. [Platform-Specific](./platform-specific.md)
**iOS vs Android differences and implementations**

Topics covered:
- Platform capabilities comparison
- Camera implementation (iOS vs Android)
- Secure storage (Keychain vs Keystore)
- Deep linking (Universal Links vs App Links)
- Safe area handling (notches, cutouts)
- Navigation bar differences
- Back button handling (Android)
- Build configuration (Xcode vs Gradle)
- App icons and splash screens
- Performance optimizations
- Common platform-specific gotchas

**Refer to this** when implementing platform-specific features.

### 4. [App Store Compliance](./app-store-compliance.md)
**Complete guide for App Store and Play Store approval**

Topics covered:
- Apple App Store requirements
  - Privacy manifest (iOS 17+)
  - Permission usage descriptions
  - App review guidelines compliance
  - Privacy questionnaire
  - Export compliance
- Google Play Store requirements
  - Data safety declaration
  - Permissions justification
  - Store listing assets
  - App signing configuration
- Privacy policy requirements
- Pre-submission checklists
- Common rejection scenarios and solutions
- Post-approval best practices

**Essential reading** before submitting to app stores.

### 5. [Dependencies](./dependencies.md)
**Complete package management and dependency documentation**

Topics covered:
- Core dependencies with version rationale
- Navigation libraries
- Camera and QR scanning
- State management (Zustand, React Query)
- Storage (AsyncStorage, Keychain)
- Networking (Axios)
- UI components (React Native Paper)
- Development dependencies (TypeScript, testing, linting)
- Complete package.json example
- Version pinning strategy
- Update management
- Native dependencies (iOS CocoaPods, Android Gradle)
- Troubleshooting common issues
- Security considerations
- Performance considerations

**Reference this** when adding new dependencies or troubleshooting.

### 6. [Testing Strategy](./testing-strategy.md)
**Comprehensive testing approach and examples**

Topics covered:
- Testing pyramid (70% unit, 20% integration, 10% E2E)
- Unit testing with Jest
  - Configuration
  - Testing utilities, stores, API modules
- Integration testing with React Native Testing Library
  - Component testing
  - Screen testing
  - Hook testing
  - React Query testing
- End-to-end testing with Detox
  - Configuration
  - Login flow tests
  - Scanner flow tests
- Manual testing checklist
- Accessibility testing
- Performance testing
- CI/CD integration
- Coverage goals by module

**Follow this** to ensure comprehensive test coverage.

### 7. [Implementation Roadmap](./implementation-roadmap.md)
**Detailed 12-week implementation plan**

Topics covered:
- Week-by-week breakdown with specific tasks
- Week 1-2: Foundation and setup
- Week 3-4: Core scanning features
- Week 5-6: Data features and UI
- Week 7-8: Platform-specific features
- Week 9-10: Testing and quality
- Week 11-12: Release preparation
- Risk mitigation strategies
- Success metrics and checkpoints
- Daily development workflow
- Weekly rituals
- Tools and workflow recommendations

**Use this** to plan sprints and track progress.

## Quick Start Guide

### For New Developers

1. **Understand the architecture**: Read [architecture.md](./architecture.md)
2. **Setup your environment**: Follow Week 1 in [implementation-roadmap.md](./implementation-roadmap.md)
3. **Learn the code organization**: Study [project-structure.md](./project-structure.md)
4. **Start coding**: Follow the roadmap week-by-week

### For Existing Team Members

1. **Need to add a feature?**
   - Check [architecture.md](./architecture.md) for patterns
   - Follow [project-structure.md](./project-structure.md) for organization
   - Write tests per [testing-strategy.md](./testing-strategy.md)

2. **Need to add a dependency?**
   - Review [dependencies.md](./dependencies.md) for guidance
   - Check version compatibility
   - Update documentation

3. **Working on platform-specific code?**
   - Reference [platform-specific.md](./platform-specific.md)
   - Test on both iOS and Android

4. **Preparing for release?**
   - Follow [app-store-compliance.md](./app-store-compliance.md)
   - Complete all checklists
   - Test on physical devices

## Key Technical Decisions

### Technology Stack

**Framework:**
- React Native 0.73.x with Hermes engine
- TypeScript (strict mode)
- iOS 13.0+ and Android 6.0+ (API 23)

**Navigation:**
- React Navigation 6.x (native stack)

**State Management:**
- Zustand for UI state, auth
- React Query for server state

**Camera:**
- react-native-vision-camera with ML Kit

**Storage:**
- react-native-keychain for tokens
- AsyncStorage for app preferences

**Testing:**
- Jest for unit tests
- React Native Testing Library for integration
- Detox for E2E tests

### Architecture Patterns

**Service-Oriented:**
- Clear separation: UI → State → Services → Platform
- Business logic in services, not components
- Platform abstractions for native features

**Type-Safe:**
- TypeScript strict mode
- Zod for runtime validation
- Fully typed API responses

## Development Principles

### Code Quality

1. **TypeScript Strict**: No `any` types
2. **Test Coverage**: >80% for critical paths
3. **Functional Components**: No class components
4. **Hooks**: Use hooks for state and lifecycle
5. **Memoization**: React.memo, useMemo, useCallback where appropriate

### Performance

1. **App Launch**: < 2 seconds
2. **Scan Processing**: < 500ms
3. **List Rendering**: Virtualized with FlatList
4. **Battery**: < 10%/hour during scanning
5. **Bundle Size**: Optimized with Hermes and inline requires

### User Experience

1. **Network Error Handling**: Clear error messages with retry options
2. **Error Handling**: User-friendly messages
3. **Loading States**: Clear feedback on all actions
4. **Accessibility**: VoiceOver/TalkBack support
5. **Platform Native**: Follows iOS and Android guidelines

## Common Tasks

### Adding a New Screen

1. Create screen component in `src/screens/`
2. Add navigation types in `src/navigation/types.ts`
3. Add route in appropriate navigator
4. Write unit and integration tests
5. Document in architecture.md if significant

### Adding a New API Endpoint

1. Add endpoint to appropriate API module in `src/services/api/modules/`
2. Create Zod schema for response validation
3. Create React Query hook in `src/hooks/api/`
4. Handle network errors with proper error messages and retry logic
5. Write unit tests for API module
6. Write integration tests for hook

### Adding a New Dependency

1. Check [dependencies.md](./dependencies.md) for similar packages
2. Verify React Native compatibility
3. Check bundle size impact
4. Install with appropriate version pinning
5. Update dependencies.md with rationale
6. Test on both iOS and Android

### Fixing a Bug

1. Write failing test that reproduces bug
2. Fix bug
3. Verify test passes
4. Check for similar bugs elsewhere
5. Update documentation if needed
6. Add to known issues if can't fix immediately

## Project Goals

### Primary Goals

- Replace existing Android app with cross-platform solution
- Support iOS 13+ and Android 6.0+
- Reliable scanning with active network connectivity
- App store approval on first submission
- < 2 second app launch time
- < 500ms scan processing time
- >99.5% crash-free rate

### Success Criteria

- Launch on both app stores within 12-14 weeks
- >4.5 star rating
- >80% test coverage
- Zero critical bugs in first month
- Positive feedback from conference organizers

## Support and Resources

### Documentation

- All documentation in `/claude/react-native/`
- Update docs when making significant changes
- Document decisions and rationale

### Code Review

- All code must be reviewed before merge
- Follow project structure and patterns
- Ensure tests are included
- Check TypeScript types

### Communication

- Daily standups: Progress, plans, blockers
- Weekly reviews: Demo progress to stakeholders
- Bi-weekly retros: Process improvements

## Troubleshooting

### Common Issues

**Metro bundler issues:**
```bash
npx react-native start --reset-cache
```

**iOS build failures:**
```bash
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

**Android build failures:**
```bash
cd android && ./gradlew clean && cd ..
```

**Dependencies out of sync:**
```bash
rm -rf node_modules package-lock.json && npm install
```

### Getting Help

1. Check existing documentation
2. Search closed issues/PRs
3. Ask team in Slack/Discord
4. Create issue with reproduction steps

## Contributing

### Before Starting Work

1. Review relevant documentation
2. Understand the architecture
3. Follow project structure
4. Write tests for new code
5. Update documentation

### Pull Request Checklist

- [ ] Code follows project structure
- [ ] TypeScript types are correct
- [ ] Tests written and passing
- [ ] Documentation updated
- [ ] Tested on iOS and Android
- [ ] No console warnings
- [ ] Performance impact considered

## Maintenance

### Regular Updates

- **Monthly**: Check for security updates in dependencies
- **Quarterly**: Update minor versions of key dependencies
- **Annually**: Consider major version updates (React Native, etc.)

### Monitoring

- Crash reports: Sentry
- App store reviews: Monitor and respond
- User feedback: Track and prioritize
- Performance metrics: Track and optimize

## Version History

### v1.0.0 (Target: Week 12)
- Initial release
- QR code scanning
- Three scan modes (check-in, sponsor, field)
- Network error handling with retry
- Attendee search
- Statistics dashboard
- Multi-conference support

### Future Versions
- v1.1.0: Push notifications
- v1.2.0: Multi-language support
- v1.3.0: Advanced reporting
- v2.0.0: Badge printing integration

## License

Copyright 2024 PostgreSQL Europe
[Include actual license information]

## Contact

- Project Lead: [Name]
- Technical Lead: [Name]
- Support: support@pgeuconf.com

---

**Last Updated**: 2024-11-08

**Documentation Version**: 1.0.0

**For Questions**: Refer to specific documentation files above or contact technical lead.
