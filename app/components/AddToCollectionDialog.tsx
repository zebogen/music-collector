import { Form, useNavigation } from "react-router";
import {
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  Stack,
  Text,
  chakra,
} from "@chakra-ui/react";
import type { Album, Collection, SpotifySearchAlbum } from "~/types";

type AddTarget =
  | { kind: "album"; album: Album }
  | { kind: "artist"; artistId: number; artistName: string }
  | { kind: "spotifySearchAlbum"; album: SpotifySearchAlbum };

export default function AddToCollectionDialog({
  open,
  onClose,
  collections,
  target,
  redirectTo,
  defaultCollectionId,
}: {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  target: AddTarget | null;
  redirectTo: string;
  defaultCollectionId?: number | null;
}) {
  const navigation = useNavigation();
  const pendingIntent = navigation.formData?.get("intent");
  const pendingAlbumId = Number(navigation.formData?.get("albumId"));
  const pendingArtistId = Number(navigation.formData?.get("artistId"));
  const pendingSpotifyId = String(navigation.formData?.get("spotifyId") ?? "");

  const isSubmitting =
    navigation.state === "submitting" &&
    ((target?.kind === "album" && pendingIntent === "add_album_to_collection" && pendingAlbumId === target.album.id) ||
      (target?.kind === "artist" && pendingIntent === "add_artist_to_collection" && pendingArtistId === target.artistId) ||
      (target?.kind === "spotifySearchAlbum" &&
        pendingIntent === "add_search_album_to_collection" &&
        pendingSpotifyId === target.album.spotifyId));

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose();
        }
      }}
      placement="center"
    >
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent mx={4}>
          <DialogHeader>
            <DialogTitle>Add to Collection</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            {target ? (
              <Stack gap={4}>
                <Text color="gray.600">
                  {target.kind === "album"
                    ? target.album.name
                    : target.kind === "artist"
                      ? target.artistName
                      : target.album.name}
                </Text>
                <Form method="post">
                  {target.kind === "album" ? (
                    <>
                      <input type="hidden" name="intent" value="add_album_to_collection" />
                      <input type="hidden" name="albumId" value={target.album.id} />
                    </>
                  ) : null}
                  {target.kind === "artist" ? (
                    <>
                      <input type="hidden" name="intent" value="add_artist_to_collection" />
                      <input type="hidden" name="artistId" value={target.artistId} />
                    </>
                  ) : null}
                  {target.kind === "spotifySearchAlbum" ? (
                    <>
                      <input type="hidden" name="intent" value="add_search_album_to_collection" />
                      <input type="hidden" name="spotifyId" value={target.album.spotifyId} />
                      <input type="hidden" name="name" value={target.album.name} />
                      <input type="hidden" name="albumType" value={target.album.albumType ?? ""} />
                      <input type="hidden" name="releaseDate" value={target.album.releaseDate ?? ""} />
                      <input type="hidden" name="imageUrl" value={target.album.imageUrl ?? ""} />
                      <input type="hidden" name="artistNames" value={JSON.stringify(target.album.artistNames)} />
                    </>
                  ) : null}
                  <input type="hidden" name="redirectTo" value={redirectTo} />

                  <Stack gap={4}>
                    <chakra.select
                      name="collectionId"
                      defaultValue={defaultCollectionId ?? ""}
                      required
                      style={{ width: "100%", minHeight: "44px", padding: "0 12px", borderRadius: "8px", border: "1px solid #CBD5E0", background: "white" }}
                    >
                      <option value="">Select a collection</option>
                      {collections.map((collection) => (
                        <option key={collection.id} value={collection.id}>{collection.name}</option>
                      ))}
                    </chakra.select>
                    <DialogFooter px={0}>
                      <Button variant="outline" onClick={onClose}>Cancel</Button>
                      <Button type="submit" colorScheme="teal" loading={isSubmitting} loadingText="Adding...">
                        Add
                      </Button>
                    </DialogFooter>
                  </Stack>
                </Form>
              </Stack>
            ) : null}
          </DialogBody>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  );
}
