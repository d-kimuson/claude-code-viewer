import { eventBus } from "../service/events/EventBus";
import { fileWatcher } from "../service/events/fileWatcher";
import type { ProjectRepository } from "../service/project/ProjectRepository";
import { projectMetaStorage } from "../service/project/projectMetaStorage";
import type { SessionRepository } from "../service/session/SessionRepository";
import { sessionMetaStorage } from "../service/session/sessionMetaStorage";

export const initialize = async (deps: {
  sessionRepository: SessionRepository;
  projectRepository: ProjectRepository;
}): Promise<void> => {
  fileWatcher.startWatching();

  setInterval(() => {
    eventBus.emit("heartbeat", {});
  }, 10 * 1000);

  eventBus.on("sessionChanged", (event) => {
    projectMetaStorage.invalidateProject(event.projectId);
    sessionMetaStorage.invalidateSession(event.projectId, event.sessionId);
  });

  try {
    console.log("Initializing projects cache");
    const { projects } = await deps.projectRepository.getProjects();
    console.log(`${projects.length} projects cache initialized`);

    console.log("Initializing sessions cache");
    const results = await Promise.all(
      projects.map((project) => deps.sessionRepository.getSessions(project.id))
    );
    console.log(
      `${results.reduce(
        (s, { sessions }) => s + sessions.length,
        0
      )} sessions cache initialized`
    );
  } catch {
    // do nothing
  }
};
