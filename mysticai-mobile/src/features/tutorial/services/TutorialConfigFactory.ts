import { TutorialRepository } from '../repository/TutorialRepository';
import { TutorialConfigService } from './TutorialConfigService';
import { TutorialRemoteConfigApi } from './TutorialRemoteConfigApi';
import { TutorialLocalSource } from '../sources/TutorialLocalSource';
import { TutorialMergedSource } from '../sources/TutorialMergedSource';
import { TutorialRemoteSource, type TutorialRemoteClient } from '../sources/TutorialRemoteSource';

export function createTutorialConfigService(remoteClient: TutorialRemoteClient | null = null): TutorialConfigService {
  const localSource = new TutorialLocalSource();
  const effectiveRemoteClient = remoteClient ?? new TutorialRemoteConfigApi();
  const remoteSource = new TutorialRemoteSource(effectiveRemoteClient);
  const mergedSource = new TutorialMergedSource(localSource, remoteSource);

  const repository = new TutorialRepository({
    local_static: localSource,
    remote_api: remoteSource,
    merged_fallback: mergedSource,
  });

  return new TutorialConfigService(repository);
}
